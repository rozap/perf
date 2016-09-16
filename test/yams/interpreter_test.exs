defmodule InterpreterTest do
  use ExUnit.Case
  alias Perf.Yams
  require Perf.Yams.Query
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

  defp eval!(stream, expr) do
    with {:ok, stream} <- Interpreter.run(stream, expr) do
      stream
      |> Query.as_stream!
      |> Enum.into([])
    end
  end

  test "can interpret a simple expr", %{one: one, two: two} do
    actual = eval!(one, [
      [".", ["bucket", 10, "milliseconds"]],
      [".", ["maximum", "row.num", "max_num"]]
    ])

    expected = two
    |> Query.bucket(10, "milliseconds")
    |> Query.maximum("row.num", "max_num")
    |> Query.as_stream!
    |> Enum.into([])

    assert actual == expected
  end

  test "can interpret an aggregated simple expr", %{one: one, two: two} do
    actual = eval!(one, [
      [".", ["bucket", 10, "milliseconds"]],
      [".", ["maximum", "row.num", "max_num"]],
      [".", ["percentile", "row.num", 95, "p95_num"]]
    ])

    expected = two
    |> Query.bucket(10, "milliseconds")
    |> Query.maximum("row.num", "max_num")
    |> Query.percentile("row.num", 95, "p95_num")
    |> Query.as_stream!
    |> Enum.into([])

    assert actual == expected
  end

  test "can interpret a nested comparison expr", %{one: one, two: two} do

    actual = eval!(one, [
      [".", ["bucket", 10, "milliseconds"]],
      [".", [
        "where",
        [">", ["row.num", 30]]
      ]]
    ])

    expected = two
    |> Query.bucket(10, "milliseconds")
    |> Query.where("row.num" > 30)
    |> Query.as_stream!
    |> Enum.into([])

    assert actual == expected
  end

  test "can interpret a compound nested comparison expr", %{one: one, two: two} do
    actual = eval!(one, [
      [".", ["bucket", 10, "milliseconds"]],
      [".", [
        "where",
        [
          "&&",
          [
            [">", ["row.num", 30]],
            ["<", ["row.num", 40]]
          ]
        ]
      ]]
    ])

    expected = two
    |> Query.bucket(10, "milliseconds")
    |> Query.where(("row.num" > 30) && ("row.num" < 40))
    |> Query.as_stream!
    |> Enum.into([])

    assert actual == expected
  end

end