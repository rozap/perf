defmodule Perf.Yams do
  use Supervisor
  alias Perf.Yams.{Registry, Handle}

  def start_link do
    Supervisor.start_link(__MODULE__, [])
  end

  def init(opts) do
    IO.puts "Supervisor #{inspect self}"
    children = [
      # worker(Registry, [])
    ]

    supervise(children, strategy: :one_for_one)
  end

  def key do
    System.os_time(:nanoseconds)
  end
end