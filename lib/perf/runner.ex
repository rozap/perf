defmodule Perf.Runner do
  use Supervisor
  alias Perf.Run
  alias Perf.Runner.{RunServer, RequestWorker}
  alias Perf.Runner.{Producer, RequestWorker, Consumer}
  alias Perf.Repo
  require Logger

  def start_link do
    Supervisor.start_link(__MODULE__, [], name: __MODULE__)
  end

  def init(_) do
    pool = [
      name: {:local, RequestWorker},
      worker_module: RequestWorker,
      size: 5000,
      max_overflow: 80
    ]

    children = [
      :poolboy.child_spec(RequestWorker, pool, []),
      worker(RunServer, [], [])
    ]

    supervise(children, strategy: :one_for_one)
  end

  def execute(run) do
    run = Repo.preload(run, suite: :requests)
    yam_ref = run.yam_ref

    Run.write_start!(run)

    {_, handle} = Perf.Yams.Handle.open(yam_ref)
    {:ok, producer} = Producer.start_link(run)
    {:ok, consumer} = Consumer.start_link(handle, run)

    Producer.step(producer, consumer)
  end

  def pool_used do
    :poolboy.status(RequestWorker)
  end
end