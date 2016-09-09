defmodule QueryTest do
  use ExUnit.Case
  alias Perf.Yams
  alias Perf.Yams.{Query, Interpreter}
  alias Perf.Yams.Query.Aggregate

  setup do
    Yams.start_link

    {:created, h} = Yams.Handle.open(UUID.uuid1())
    from_ts = 1472175016297554068
    Enum.each(30..60, fn num ->
      t = num - 30
      key = from_ts + Yams.ms_to_key(t)
      :ok = Yams.Handle.put(h, key, %{"num" => num, "str" => "foo_#{num}"})
    end)
    to_ts = from_ts + Yams.ms_to_key(20)
    range = {from_ts, to_ts}

    two = Yams.Handle.stream!(h, range)
    one = Yams.Handle.stream!(h, range)

    {:ok, %{one: one, two: two}}
  end

  test "can interpret a simple expr", %{one: one, two: two} do
    actual = Interpreter.evaluate(:some_stream, [
      [:., [], ["bucket", 10, "milliseconds"]],
      [:., [], ["maximum", "num"]]
    ])

    expected = quote do
      Perf.Yams.Query.maximum(Perf.Yams.Query.bucket(:some_stream, 10, "milliseconds"), "num")
    end

    assert actual == expected
  end

end