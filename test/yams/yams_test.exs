defmodule YamsTest do
  use ExUnit.Case
  alias Perf.Yams

  setup do
    Yams.start_link
    :ok
  end

  test "can put and get" do
    from_ts = "#{System.os_time(:milliseconds) - 1500}"

    {:ok, h} = Yams.Handle.open(UUID.uuid1())

    :ok = Yams.Handle.put(h, [:a, :b, :c])
    :ok = Yams.Handle.put(h, [:d, :e, :f])
    :ok = Yams.Handle.put(h, [:g, :h, :i])

    to_ts = "#{System.os_time(:milliseconds) + 1500}"



    Yams.Handle.stream!(h, from_ts, to_ts)
    |> Enum.map(fn {key, value} -> value end)
    |> Enum.into([])
    |> IO.inspect

  end
end