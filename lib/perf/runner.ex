defmodule Perf.Runner do
  use Supervisor
  alias Perf.Runner.{RunServer, RequestWorker}
  alias Perf.{Suite, Run, Repo, Yams, Request}
  alias Experimental.GenStage
  alias Perf.Runner.{Producer, RequestWorker, RequestTracker, Consumer}
  require Logger

  def start_link do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(_) do
    pool = [
      name: {:local, RequestWorker},
      worker_module: RequestWorker,
      size: 800,
      max_overflow: 80
    ]

    children = [
      :poolboy.child_spec(RequestWorker, pool, []),
      worker(RunServer, [], [])
    ]

    supervise(children, strategy: :one_for_one)
  end

  def execute(run) do
    suite = Repo.preload(run.suite, :requests)
    yam_ref = run.yam_ref

    {_, handle} = Perf.Yams.Handle.open(yam_ref)
    {:ok, producer} = Producer.start_link(run)
    {:ok, consumer} = Consumer.start_link(handle, run)

    Producer.next_request(producer, consumer)

    # Logger.debug("Producer #{inspect producer} Consumer #{inspect consumer}")

    # c = run.suite.requests
    # |> Enum.map(fn %Request{concurrency: c} -> c end)
    # |> Enum.max

    # workers = (0..c)
    # |> Enum.map(fn _ -> :poolboy.checkout(RequestWorker) end)
    # |> Enum.map(fn worker ->
    #   GenStage.sync_subscribe(consumer, to: worker, min_demand: 0, max_demand: 1)
    #   worker
    # end)

    # Logger.debug("Created #{inspect workers}")

    # Producer.next_request(producer)

    # Enum.each(workers, fn worker ->
    #   GenStage.sync_subscribe(worker, to: producer, min_demand: 0, max_demand: 1)
    # end)

    :ok
  end
end