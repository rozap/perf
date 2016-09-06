defmodule Perf.Yams.Stats do

  def ms_to_nano(ms), do: ms * 1000000

  def bucket(stream, {from_ts, _}, ns_bucket) do
    Stream.chunk_by(stream, fn {time, _} = e ->
      Float.floor((time - from_ts) / ns_bucket)
    end)
  end

  def percentiles(bucket_stream, places, key_fn) do
    Stream.map(bucket_stream, fn bucket ->
      values = Enum.filter_map(
        bucket, 
        fn {_, event} -> key_fn.(event) end,
        fn {_, event} -> key_fn.(event) end
      )

      ps = Enum.map(places, fn p ->
        Statistics.percentile(values, p)
      end)

      {bucket, ps}
    end)
  end

end
