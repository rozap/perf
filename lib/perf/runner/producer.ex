defmodule Perf.Runner.Producer do
  alias Experimental.GenStage
  use GenStage
  require Logger
  alias Perf.Suite.Request
  alias Perf.Yams
  alias Experimental.GenStage
  alias Perf.Runner.{RequestWorker, RequestTracker, Consumer}
  alias Perf.Runner.Events.{StartingRequest, Done}


  def start_link(run) do
    GenStage.start_link(__MODULE__, run)
  end

  def init(run) do
    state = %{
      run: run,
      requests: run.suite.requests,
      workers: []
    }
    {:producer, state}
  end

  # def handle_demand(demand, %{current: :not_started} = state) do
  #   {:noreply, [], state}
  # end

  def handle_demand(demand, %{requests: []} = state) do
    {:noreply, [], state}
  end

  def handle_demand(demand, %{requests: [request | _]} = state) do
    IO.puts "Demand for #{inspect request}"
    {:noreply, [request], state}
  end


  def handle_call(:next_request, _, %{requests: []} = state) do
    {:reply, %Done{at: Yams.key, ref: make_ref()}, [], state}
  end

  def handle_call(:next_request, _, %{requests: [request | rest]} = state) do
    Logger.debug("Moving to request #{inspect request}")

    new_state = state
    |> Map.put(:current, request)
    |> Map.put(:requests, rest)

    drain_time = request.runlength + request.timeout + request.receive_timeout
    :timer.apply_after(drain_time, __MODULE__, :next_request, [self])

    starting = %StartingRequest{
      request: request,
      at: Yams.key,
      ref: make_ref()
    }

    {:reply, starting, [], new_state}
  end

  def next_request(pid) do
    broadcast = GenStage.call(pid, :next_request)
    GenStage.sync_notify(pid, {:broadcast, broadcast})
  end

  def execute(run, ref) do
    {_, handle} = Perf.Yams.Handle.open(ref)
    {:ok, producer} = __MODULE__.start_link(run)
    {:ok, consumer} = Consumer.start_link(handle)

    Logger.debug("Producer #{inspect producer} Consumer #{inspect consumer}")

    c = run.suite.requests
    |> Enum.map(fn %Request{concurrency: c} -> c end)
    |> Enum.max

    workers = (0..c)
    |> Enum.map(fn _ -> :poolboy.checkout(RequestWorker) end)

    trackers = workers
    |> Enum.chunk(20, 20, [])
    |> Enum.map(fn workers ->
      {:ok, tracker} = RequestTracker.start_link(run)

      GenStage.sync_subscribe(consumer, to: tracker, min_demand: 0, max_demand: 20)
      Enum.each(workers, fn worker ->
        GenStage.sync_subscribe(tracker, to: worker, min_demand: 0, max_demand: 2)
      end)
      tracker
    end)

    Enum.each(workers, fn worker ->
      GenStage.sync_subscribe(worker, to: producer, min_demand: 0, max_demand: 1)
    end)

    next_request(producer)

    Perf.Yams.Handle.changes(handle)
  end
end