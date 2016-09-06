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

  def key_to_seconds(k) do
    key_to_ms(k) / 1000
  end

  def ms_to_key(ms) do
    ms * @ms_factor
  end

  def seconds_to_key(s) do
    ms_to_key(s * 1000)
  end

  def to_key(%Ecto.DateTime{} = dt) do
    dt
    |> Ecto.DateTime.to_erl
    |> :calendar.datetime_to_gregorian_seconds
    |> seconds_to_key
  end
end