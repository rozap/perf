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

  @ms_factor 1000 * 1000
  def key_to_ms(k) do
    k / @ms_factor
  end

  def ms_to_key(ms) do
    ms * @ms_factor
  end
end