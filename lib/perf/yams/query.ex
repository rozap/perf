defmodule Perf.Yams.Query do
  alias Perf.Yams

  defmodule State do
    defstruct range: {:none, :none}, stream: nil
  end

  defmodule Bucket do
    defstruct start_t: nil, end_t: nil, data: [], aggregations: []
  end

  defmodule Aggregate do
    defstruct start_t: nil, end_t: nil, aggregations: %{}
  end


  ##
  # Convert tests to use /2 args here instead of tuple for {unit, quant}
  # will make interpreter easier
  def bucket(state, seconds, "seconds") do
    bucket(state, Yams.seconds_to_key(seconds), "nanoseconds")
  end
  def bucket(state, ms, "milliseconds") do
    bucket(state, Yams.ms_to_key(ms), "nanoseconds")
  end

  def bucket(%State{stream: stream, range: {from_ts, _}} = state, nanoseconds, "nanoseconds") do
    chunked = Stream.chunk_by(stream, fn {time, _} = e ->
      Float.floor((time - from_ts) / nanoseconds)
    end)
    |> Stream.map(fn bucket ->
      {{mini, _}, {maxi, _}} = Enum.min_max_by(bucket, fn {t, _} -> t end)
      %Bucket{data: bucket, start_t: mini, end_t: maxi}
    end)

    struct(state, stream: chunked)
  end

  defp reduce(bucket_stream, acc, func) do
    Stream.map(bucket_stream, fn bucket ->
      {key, value} = Enum.reduce(bucket.data, acc, func)
      struct(bucket, aggregations: [{key, value} | bucket.aggregations])
    end)
  end

  defp group(%State{} = state, field_name, group_name, func) do
    key = "#{group_name}_#{field_name}"
    new_stream = reduce(state.stream, {key, nil}, fn
      {_, datum}, {_, nil} -> {key, Map.get(datum, field_name)}
      {_, datum}, {_, group_acc} ->
        case Map.get(datum, field_name) do
          nil -> {key, group_acc}
          other ->
            {key, func.(other, group_acc)}
        end
    end)

    struct(state, stream: new_stream)
  end

  def minimum(state, field_name) do
    group(state, field_name, "min", &min/2)
  end

  def maximum(state, field_name) do
    group(state, field_name, "max", &max/2)
  end

  def percentile(state, field_name, p) do
    key = "p#{p}_#{field_name}"
    new_stream = Stream.map(state.stream, fn bucket ->
      value = case Enum.map(bucket.data, fn {_, datum} -> Map.get(datum, field_name) end) do
        [] -> 0
        [n] -> n
        others -> Statistics.percentile(others, p)
      end

      struct(bucket, aggregations: [{key, value} | bucket.aggregations])
    end)

    struct(state, stream: new_stream)
  end




  defp bind_row([{e, m, args} | rest]) do
    [{e, m, bind_row(args)} | bind_row(rest)]
  end

  defp bind_row({comparator, meta, args}) do
    {comparator, meta, bind_row(args)}
  end

  defp bind_row(str) when is_binary(str) do
    {
      {:., [], [
        {:__aliases__, [alias: false], [:Map]},
        :get
      ]}, [],
      [Macro.var(:row, nil), str]
    }
  end

  defp bind_row([prim | rest]) do
    [bind_row(prim) | bind_row(rest)]
  end

  defp bind_row(prim) do
    prim
  end

  defmacro where(body, expr) do
    rowified = bind_row(expr)

    quote do
      func = fn t ->
        var!(row) = t
        unquote(rowified)
      end

      %State{stream: stream} = s = unquote(body)
      new_stream = Stream.flat_map(stream, fn
        %Bucket{} = b    ->
          data = Enum.filter(b.data, fn {_, datum} ->
            func.(datum)
          end)
          [struct(b, data: data)]
        %Aggregate{} = a ->
          if func.(a.aggregations) do
            [a]
          else
            []
          end
      end)
      struct(s, stream: new_stream)
    end
  end


  def aggregates(%State{stream: stream} = state) do
    new_stream = Stream.map(stream, fn %Bucket{aggregations: aggs} = b ->
      %Aggregate{
        start_t: b.start_t,
        end_t: b.end_t,
        aggregations: Enum.into(aggs, %{})
      }
    end)

    struct(state, stream: new_stream)
  end

  def as_stream!(%State{stream: stream}), do: stream
end