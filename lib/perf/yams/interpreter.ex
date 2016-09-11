defmodule Perf.Yams.Interpreter do
  @query [:Perf, :Yams, :Query]

  defp el_expr([".", [func_name | args]]) do
    {
      {:., [], [
        {:__aliases__, [], @query},
        String.to_atom(func_name)
      ]},
      [],
      Enum.map(args, &el_expr/1)
    }
  end

  defp el_expr([c, args]) when is_list(args) do
    {String.to_atom(c), [], Enum.map(args, &el_expr/1)}
  end

  defp el_expr([c, meh]) do
    {String.to_atom(c), [], __MODULE__}
  end


  defp el_expr(prim), do: prim

  defp prepend_arg({c, meta, args}, to_prep) do
    {c, meta, [to_prep | Enum.map(args, &el_expr/1)]}
  end

  def compile(pipeline) do
    compiled = Enum.reduce(pipeline, Macro.var(:yam_stream, nil), fn
      (node, upstream) ->
        node
        |> el_expr
        |> prepend_arg(upstream)
    end)

    quoted = quote do
      fn s ->
        var!(yam_stream) = s
        unquote(compiled)
      end
    end

    {:ok, quoted}
  end

  def run(stream, pipeline) do
    with {:ok, quoted} <- compile(pipeline) do
      {func, _} = Code.eval_quoted(quoted)
      try do
        {:ok, func.(stream)}
      rescue
        e -> {:error, e}
      end
    end
  end




end