defmodule Perf.Runner.Producer do
  alias Experimental.GenStage
  use GenStage
  require Logger
  alias Perf.Suite.Request
  alias Perf.Yams
  alias Perf.{Suite, Run, Repo}
  alias Experimental.GenStage
  alias Perf.Runner.{RequestWorker, RequestTracker, Consumer}
  alias Perf.Runner.Events.{StartingRequest, Done}


  def start_link(run) do
    GenStage.start_link(__MODULE__, run)
  end

  def init(run) do
    state = %{
      run: run,
      requests: run.suite.requests
    }
    {:producer, state, [buffer_size: 10, buffer_keep: :last]}
  end

  def handle_demand(demand, %{request: :done} = state) when demand > 0 do
    {:noreply, [], state}
  end

  def handle_demand(demand, %{request: request} = state) when demand > 0 do
    {:noreply, [request], state}
  end

  def handle_call(:next_request, _, %{requests: []} = state) do
    new_state = Map.put(state, :request, :done)
    {:reply, %Done{at: Yams.key, ref: make_ref()}, [], new_state}
  end

  def handle_call(:next_request, _, %{requests: [request | rest]} = state) do
    Logger.debug("Moving to request #{inspect request}")

    new_state = state
    |> Map.put(:request, request)
    |> Map.put(:requests, rest)

    drain_time = request.runlength + request.timeout + request.receive_timeout
    :timer.apply_after(drain_time, __MODULE__, :next_request, [self])

    starting = %StartingRequest{
      request: request,
      at: Yams.key,
      ref: make_ref()
    }

    {:reply, starting, [request], new_state}
  end

  def next_request(pid) do
    broadcast = GenStage.call(pid, :next_request)
    GenStage.sync_notify(pid, {:broadcast, broadcast})
  end

  def execute(suite) do
    yam_ref = UUID.uuid1()
    with {:ok, run} <- Repo.insert(%Run{suite: suite, yam_ref: yam_ref}) do

      {_, handle} = Perf.Yams.Handle.open(yam_ref)
      {:ok, producer} = __MODULE__.start_link(run)
      {:ok, consumer} = Consumer.start_link(handle, run)

      Logger.debug("Producer #{inspect producer} Consumer #{inspect consumer}")

      c = run.suite.requests
      |> Enum.map(fn %Request{concurrency: c} -> c end)
      |> Enum.max

      workers = (0..c)
      |> Enum.map(fn _ -> :poolboy.checkout(RequestWorker) end)
      |> Enum.map(fn worker ->
        GenStage.sync_subscribe(consumer, to: worker, min_demand: 0, max_demand: 1)
        worker
      end)

      Logger.debug("Created #{inspect workers}")

      next_request(producer)

      Enum.each(workers, fn worker ->
        GenStage.sync_subscribe(worker, to: producer, min_demand: 0, max_demand: 1)
      end)

      stream = Perf.Yams.Handle.changes(handle)

      {:ok, stream}
    end
  end
end