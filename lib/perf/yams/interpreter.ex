defmodule Perf.Yams.Interpreter do
  @query [:Perf, :Yams, :Query]

  defp el_expr([:., [], [func_name | args]]) do
    {
      {:., [], [
        {:__aliases__, [alias: false], @query},
        String.to_atom(func_name)
      ]},
      [],
      args
    }
  end

  defp prepend_arg({c, meta, args}, to_prep) do
    {c, meta, [to_prep | args]}
  end

  def evaluate(stream, pipeline) do
    Enum.reduce(pipeline, stream, fn
      (node, upstream) ->
        node
        |> el_expr
        |> prepend_arg(upstream)
    end)
  end



end