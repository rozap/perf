defmodule QueryTest do
  use ExUnit.Case
  alias Perf.Yams
  require Perf.Yams.Query
  alias Perf.Yams.Query
  alias Perf.Yams.Query.Aggregate
  import Perf.TestHelpers

  setup do
    Yams.start_link
    stream = make_yam_stream
    {:ok, %{stream: stream}}
  end

  test "can get the minimum per bucket", %{stream: stream} do
    mins = stream
    |> Query.bucket(10, :milliseconds)
    |> Query.minimum("num")
    |> Query.aggregates
    |> Query.as_stream!
    |> Stream.map(fn %Aggregate{aggregations: %{"min_num" => mn}} -> mn end)
    |> Enum.into([])

    assert mins == [30, 40, 50]
  end

  test "can get the maximum per bucket", %{stream: stream} do
    maxes = stream
    |> Query.bucket(10, :milliseconds)
    |> Query.maximum("num")
    |> Query.aggregates
    |> Query.as_stream!
    |> Stream.map(fn %Aggregate{aggregations: %{"max_num" => mn}} -> mn end)
    |> Enum.into([])

    assert maxes == [39, 49, 50]
  end

  test "can get the percentile per bucket", %{stream: stream} do
    ps = stream
    |> Query.bucket(10, :milliseconds)
    |> Query.percentile("num", 80)
    |> Query.aggregates
    |> Query.as_stream!
    |> Stream.map(fn %Aggregate{aggregations: %{"p80_num" => mn}} -> mn end)
    |> Enum.into([])

    assert ps == [37.2, 47.2, 50]
  end

  test "can compose aggregations", %{stream: stream} do
    aggs = stream
    |> Query.bucket(10, :milliseconds)
    |> Query.percentile("num", 80)
    |> Query.maximum("num")
    |> Query.minimum("num")
    |> Query.percentile("num", 99)
    |> Query.aggregates
    |> Query.as_stream!
    |> Stream.map(fn %Aggregate{aggregations: a} -> a end)
    |> Enum.into([])

    assert aggs == [
      %{"max_num" => 39, "min_num" => 30, "p80_num" => 37.2, "p99_num" => 38.91},
      %{"max_num" => 49, "min_num" => 40, "p80_num" => 47.2, "p99_num" => 48.91},
      %{"max_num" => 50, "min_num" => 50, "p80_num" => 50, "p99_num" => 50}
    ]
  end

  test "can filter raw things in a bucket", %{stream: stream} do
    nums = stream
    |> Query.bucket(10, :milliseconds)
    |> Query.where("num" > 32 && "num" < 36)
    |> Query.as_stream!
    |> Stream.map(fn bucket -> Enum.map(bucket.data, fn {_, d} -> d["num"] end) end)
    |> Enum.into([])
    |> List.flatten

    assert nums == [33, 34, 35]
  end

  test "can filter aggregates", %{stream: stream} do
    [agg] = stream
    |> Query.bucket(10, :milliseconds)
    |> Query.percentile("num", 80)
    |> Query.aggregates
    |> Query.where("p80_num" > 37 && "p80_num" < 38)
    |> Query.as_stream!
    |> Stream.map(fn a -> a.aggregations["p80_num"] end)
    |> Enum.into([])

    assert agg == 37.2
  end
end