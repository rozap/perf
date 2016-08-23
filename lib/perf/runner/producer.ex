defmodule Perf.Runner.Producer do
  alias Experimental.GenStage
  use GenStage
  require Logger
  alias Perf.Suite.Request
  alias Experimental.GenStage
  alias Perf.Runner.{RequestWorker, RequestTracker, Consumer}

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

  def handle_demand(demand, state) do
    IO.puts "Demand of #{inspect demand}"
    {:noreply, [:stop], state}
  end

  def execute(run) do
    {:ok, producer} = __MODULE__.start_link(run)
    {:ok, consumer} = Consumer.start_link

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

      GenStage.sync_subscribe(consumer, to: tracker)
      Enum.each(workers, fn worker ->
        GenStage.sync_subscribe(tracker, to: worker)
      end)
      tracker
    end)

    Enum.each(workers, fn worker ->
      GenStage.sync_subscribe(worker, to: producer)
    end)

    receive do
      :ok -> :ok
    after 1000 ->
      IO.puts "Stopping?"
      GenStage.stop(consumer, :normal)
    end
  end


  # def handle_cast(:next, %{run: run, requests: []} = state) do
  #   Logger.debug("#{run.id} #{run.suite.name} has completed")

  #   state = cleanup(state)
  #   Consumer.complete(state.consumer, :done)
  #   {:stop, :done, state}
  # end

  # def handle_cast(:next,  %{run: run, requests: [request | next_requests]} = state) do
  #   cleanup(state)

  #   workers = 0..request.concurrency
  #   |> Enum.map(fn _ -> 
  #     :poolboy.checkout(RequestWorker)
  #     |> RequestWorker.request(request) 
  #   end)

  #   trackers = workers
  #   |> Enum.chunk(20, 20, [])
  #   |> Enum.map(fn workers ->
  #     {:ok, tracker} = RequestTracker.start(run)

  #     GenStage.sync_subscribe(state.consumer, to: tracker)
  #     Enum.each(workers, fn worker ->
  #       GenStage.sync_subscribe(tracker, to: worker)
  #     end)

  #     tracker
  #   end)

  #   :timer.apply_after(request.runlength, __MODULE__, :next, [self])

  #   next_state = state
  #   |> Map.put(:requests, next_requests)
  #   |> Map.put(:workers, workers)

  #   {:noreply, next_state}
  # end

  # def handle_events(events, _from, state) do
  #   Logger.debug("Coordinator got events")
  #   {:noreply, [], state}
  # end

  # def next(pid) do
  #   GenServer.cast(pid, :next)
  # end

  # def run(pid) do
  #   Logger.debug("next...")
  #   next(pid)
  # end

  # def cleanup(state) do
  #   Enum.each(state.workers, fn worker -> 
  #     RequestWorker.stop(worker)
  #   end)

  #   Map.put(state, :workers, [])
  # end

  # def terminate(_, state) do
  #   cleanup(state)
  #   :ok
  # end

end