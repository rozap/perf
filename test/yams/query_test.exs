defmodule QueryTest do
  use ExUnit.Case
  alias Perf.Yams
  alias Perf.Yams.Query
  alias Perf.Yams.Query.Aggregate

  setup do
    Yams.start_link

    {:created, h} = Yams.Handle.open(UUID.uuid1())
    from_ts = 1472175016297554068
    Enum.each(30..60, fn num ->
      t = num - 30
      key = from_ts + Yams.ms_to_key(t)
      :ok = Yams.Handle.put(h, key, %{num: num, str: "foo_#{num}"})
    end)
    to_ts = from_ts + Yams.ms_to_key(20)
    range = {from_ts, to_ts}

    stream = Yams.Handle.stream!(h, range)

    {:ok, %{stream: stream}}
  end

  test "can get the minimum per bucket", %{stream: stream} do
    mins = stream
    |> Query.bucket({:milliseconds, 10})
    |> Query.minimum(:num)
    |> Query.as_aggregate!
    |> Stream.map(fn %Aggregate{aggregations: %{"min_num" => mn}} -> mn end)
    |> Enum.into([])

    assert mins == [30, 40, 50]
  end

  test "can get the maximum per bucket", %{stream: stream} do
    maxes = stream
    |> Query.bucket({:milliseconds, 10})
    |> Query.maximum(:num)
    |> Query.as_aggregate!
    |> Stream.map(fn %Aggregate{aggregations: %{"max_num" => mn}} -> mn end)
    |> Enum.into([])

    assert maxes == [39, 49, 50]
  end

  test "can get the percentile per bucket", %{stream: stream} do
    ps = stream
    |> Query.bucket({:milliseconds, 10})
    |> Query.percentile(:num, 80)
    |> Query.as_aggregate!
    |> Stream.map(fn %Aggregate{aggregations: %{"p80_num" => mn}} -> mn end)
    |> Enum.into([])

    assert ps == [37.2, 47.2, 50]
  end

  test "can compose aggregations", %{stream: stream} do
    aggs = stream
    |> Query.bucket({:milliseconds, 10})
    |> Query.percentile(:num, 80)
    |> Query.maximum(:num)
    |> Query.minimum(:num)
    |> Query.percentile(:num, 99)
    |> Query.as_aggregate!
    |> Stream.map(fn %Aggregate{aggregations: a} -> a end)
    |> Enum.into([])

    assert aggs == [
      %{"max_num" => 39, "min_num" => 30, "p80_num" => 37.2, "p99_num" => 38.91},
      %{"max_num" => 49, "min_num" => 40, "p80_num" => 47.2, "p99_num" => 48.91},
      %{"max_num" => 50, "min_num" => 50, "p80_num" => 50, "p99_num" => 50}
    ]

  end


end