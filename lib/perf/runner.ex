defmodule Perf.Runner do
  use Supervisor
  alias Perf.Runner.RequestWorker

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
      :poolboy.child_spec(RequestWorker, pool, [])
    ]

    supervise(children, strategy: :one_for_one)
  end
end