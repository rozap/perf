defmodule StatsTest do
  use ExUnit.Case
  alias Perf.Yams

  setup do
    Yams.start_link
    :ok
  end

  test "can bucket a stream" do
    {:created, h} = Yams.Handle.open(UUID.uuid1())
    from_ts = 1472175016297554068
    Enum.each(1..30, fn num ->
      key = from_ts + Yams.Stats.ms_to_nano(num)
      :ok = Yams.Handle.put(h, key, %{num: num})
    end)
    to_ts = from_ts + Yams.Stats.ms_to_nano(20)
    range = {from_ts, to_ts}

    buckets = Yams.Handle.stream!(h, range)
    |> Yams.Stats.bucket(range, Yams.Stats.ms_to_nano(11))
    |> Enum.into([])

    assert length(buckets) == 2

    orig = List.flatten(buckets) |> Enum.map(fn {_, %{num: n}} -> n end)

    assert orig == Enum.to_list(1..20)
  end


  test "can get percentiles of a bucket stream" do
    {:created, h} = Yams.Handle.open(UUID.uuid1())

    from_ts = 1472175016297554068
    Enum.each(1..30, fn num ->
      key = from_ts + Yams.Stats.ms_to_nano(num)
      :ok = Yams.Handle.put(h, key, %{num: num})
    end)
    to_ts = from_ts + Yams.Stats.ms_to_nano(21)
    range = {from_ts, to_ts}

    [{_bucket1, percs} | _] = Yams.Handle.stream!(h, range)
    |> Yams.Stats.bucket(range, Yams.Stats.ms_to_nano(11))
    |> Yams.Stats.percentiles([50, 75, 95], fn %{num: n} -> n end)
    |> Enum.into([])

    [fifty, seventy_five, ninety_five] = percs

    assert_in_delta(fifty, 5.5, 0.001)
    assert_in_delta(seventy_five, 7.75, 0.001)
    assert_in_delta(ninety_five, 9.55, 0.001)
  end
end