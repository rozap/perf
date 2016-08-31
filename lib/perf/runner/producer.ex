defmodule Perf.Runner.Producer do
  alias Experimental.GenStage
  use GenStage
  require Logger
  alias Perf.Request
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


end