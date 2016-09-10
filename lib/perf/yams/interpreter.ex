defmodule Perf.Yams.Interpreter do
  @query [:Perf, :Yams, :Query]

  defp el_expr([:., [], [func_name | args]]) do
    {
      {:., [], [
        {:__aliases__, [], @query},
        String.to_atom(func_name)
      ]},
      [],
      Enum.map(args, &el_expr/1)
    }
  end

  defp el_expr([c, m, args]) when is_list(args) do
    {c, m, Enum.map(args, &el_expr/1)}
  end
  defp el_expr([c, m, meh]) do
    IO.puts "c: #{c} #{inspect meh}"
    {String.to_atom(c), m, __MODULE__}
  end


  defp el_expr(prim), do: prim

  defp prepend_arg({c, meta, args}, to_prep) do
    {c, meta, [to_prep | Enum.map(args, &el_expr/1)]}
  end

  def insert_stream(stream, pipeline) do
    Enum.reduce(pipeline, stream, fn
      (node, upstream) ->
        node
        |> el_expr
        |> prepend_arg(upstream)
    end)
  end



end