defmodule Perf.Runner.Producer do
  use GenServer
  require Logger
  alias Perf.Yams
  alias Perf.Runner.{RequestWorker, Consumer}
  alias Perf.Runner.Events.{StartingRequest, Done}


  def start_link(run) do
    GenServer.start_link(__MODULE__, run)
  end

  def init(run) do
    state = %{
      run: run,
      requests: run.suite.requests,
      workers: MapSet.new,
      wait_pool: MapSet.new,
      consumer: :none
    }
    {:ok, state}
  end

  defp allocate_workers(concurrency, run, workers) do
    if concurrency > MapSet.size(workers) do
      (MapSet.size(workers)..concurrency)
      |> Enum.map(fn _ ->
        pid = :poolboy.checkout(RequestWorker)
        {pid, Process.monitor(pid)}
      end)
      |> MapSet.new
      |> MapSet.union(workers)
    else
      {keep, free} = workers
      |> MapSet.to_list
      |> Enum.split(concurrency)

      remove = free
      |> Enum.map(fn {pid, _ref} ->
        :poolboy.checkin(RequestWorker, pid)
        {pid, Process.demonitor(pid)}
      end)
      |> MapSet.new

      keep
      |> MapSet.new
      |> MapSet.difference(remove)
    end

  end

  def handle_info({:DOWN, ref, :process, _pid, _reason}, state) do
    new_pool = MapSet.delete(state.wait_pool, ref)
    {:noreply, apply_new_pool(state, new_pool)}
  end

  def handle_cast({:step, consumer}, %{requests: [request | rest]} = state) do
    Logger.info("Moving to request #{inspect request}")

    concurrency = request.min_concurrency

    Consumer.on_event(consumer, %StartingRequest{
      at: Yams.key,
      request: request,
      concurrency: concurrency,
      ref: make_ref
    })

    workers = allocate_workers(concurrency, request, state.workers)
    until = Yams.key + Yams.ms_to_key(request.step_duration)

    workers
    |> Enum.each(fn {worker, _} ->
      RequestWorker.work_on(worker, request, until, consumer)
    end)

    new_state = state
    |> Map.put(:wait_pool, workers)
    |> Map.put(:workers, workers)
    |> Map.put(:requests, rest)
    |> Map.put(:consumer, consumer)

    {:noreply, new_state}
  end

  def handle_cast({:on_complete, worker_pid}, state) do
    new_pool = state.wait_pool
    |> Enum.filter(fn
      {^worker_pid, _} ->
        Logger.debug("#{inspect worker_pid} is done")
        false
      _ -> true
    end)
    |> MapSet.new

    new_state = apply_new_pool(state, new_pool)

    {:noreply, new_state}
  end

  defp apply_new_pool(state, new_pool) do
    state = case MapSet.size(new_pool) do
      0 ->
        Logger.warn("DONE")

        ## TODO: this should be next step


        Consumer.on_event(state.consumer, %Done{
          at: Yams.key,
          ref: make_ref
        })
        state
      _ ->
        state
    end

    Map.put(state, :wait_pool, new_pool)
  end

  def step(pid, consumer) do
    GenServer.cast(pid, {:step, consumer})
  end

  def on_complete(pid) do
    GenServer.cast(pid, {:on_complete, self})
  end

end