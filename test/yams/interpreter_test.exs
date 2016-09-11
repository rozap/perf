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
      [".", ["maximum", "num"]]
    ])

    expected = two
    |> Query.bucket(10, "milliseconds")
    |> Query.maximum("num")
    |> Query.as_stream!
    |> Enum.into([])

    assert actual == expected
  end

  # test "can interpret a nested comparison expr", %{one: one, two: two} do

  #   actual = with {:ok, stream} <- Interpreter.run(one, [
  #     [".", ["bucket", 10, "milliseconds"]],
  #     [".", ["maximum", "num"]]
  #   ]) do
  #     stream
  #     |> Query.as_stream!
  #     |> Enum.into([])
  #   end

  #   actual = Interpreter.insert_stream(:some_stream, [
  #     [".", ["bucket", 10, "milliseconds"]],
  #     [".", [
  #       "where",
  #       [">", ["num", 30]]
  #     ]]
  #   ])

  #   expected = quote do
  #     Perf.Yams.Query.where(Perf.Yams.Query.bucket(:some_stream, 10, "milliseconds"), "num" > 30)
  #   end
  #   |> remove_meta

  #   assert actual == expected
  # end

  # test "can interpret a compound nested comparison expr", %{one: one, two: two} do
  #   actual = Interpreter.insert_stream(:some_stream, [
  #     [".", ["bucket", 10, "milliseconds"]],
  #     [".", [
  #       "where",
  #       [
  #         "&&",
  #         [
  #           [">", ["num", 30]],
  #           ["<", ["num", 40]]
  #         ]
  #       ]
  #     ]]
  #   ])

  #   expected = quote do
  #     Perf.Yams.Query.where(Perf.Yams.Query.bucket(:some_stream, 10, "milliseconds"), ("num" > 30) && ("num" < 40))
  #   end
  #   |> remove_meta

  #   assert actual == expected
  # end

  # test "can apply the expression to a stream", %{one: one, two: two} do
  #   actual = Interpreter.insert_stream(one, [
  #     [".", ["bucket", 10, "milliseconds"]],
  #     [".", ["maximum", "num"]]
  #   ])

  #   IO.inspect actual
  # end

end