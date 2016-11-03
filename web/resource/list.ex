defmodule Perf.Resource.ListAny do
  import Ecto.Query
  alias Perf.Resource.State
  require Logger

  @page_size 16

  def query(model, %State{params: params} = state) do
    query = from(m in model.__struct__)
    |> order_by([m], [desc: m.updated_at])
    |> apply_filters(params)

    struct(state, query: query)
  end


  def filter(query, {name, value}) do
    case String.split(name, ".") do
      [name] ->
        fname = String.to_atom(name)
        query |> where([m], field(m, ^fname) == ^value)
      nested -> 
        # IO.inspect
        query
    end
  end

  def apply_filters(query, %{"where" => wheres}) do
    Enum.reduce(wheres, query, fn clause, q ->
      filter(q, clause)
    end)
  end

  def apply_filters(query, _), do: query

  defp offset_limit(%State{params: params}) do
    offset = Dict.get(params, "offset", 0)
    limit = Dict.get(params, "limit", @page_size)

    {offset, limit}
  end

  def evaluate(_, %State{query: query, params: params} = state) do
    {offset, limit} = offset_limit(state)

    IO.inspect params
    Logger.info("Fetching #{offset} #{limit}")

    try do
      query = query
      |> limit([m], ^limit)
      |> offset([m], ^offset)

      model = Perf.Repo.all(query |> select([m], m))

      struct(state, model: model)
    rescue
      e in [Ecto.QueryError] ->
        struct(state, error: %{query: e.message})
      e in [Postgrex.Error] ->
        struct(state, error: %{query: e.postgres.message or e.postgres.hint})
    end
  end

  def meta(_, %State{model: models, query: query} = state) do
    count = query
    |> exclude(:order_by)
    |> select([m], count(m.id))
    |> Perf.Repo.one
    

    {offset, limit} = offset_limit(state)

    resp = %{}
    |> Dict.put("items", models)
    |> Dict.put("count", count)
    |> Dict.put("page_size", @page_size)
    |> Dict.put("page", trunc(offset / @page_size))
    |> Dict.put("page_count", trunc(count / @page_size))
    
    struct(state, resp: resp)
  end
end

defimpl Perf.Resource.List, for: Any do
  use Perf.Resource
  stage :query,    mod: Perf.Resource.ListAny
  stage :evaluate, mod: Perf.Resource.ListAny
  stage :meta,     mod: Perf.Resource.ListAny
end
