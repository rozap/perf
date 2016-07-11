defmodule Perf.Resource.ReadAny do
  import Ecto.Query
  alias Perf.Resource.State

  def read(model, %State{params: params, socket: socket} = state) do
    query = from(m in model.__struct__)
    [id_name] = model.__struct__.__schema__(:primary_key)
    case Map.get(params, Atom.to_string(id_name)) do
      nil ->
        {:error, {%{id: :not_found}, socket}}
      id ->
        results = query
        |> where([m], m.id == ^id)
        |> select([m], m)
        |> Perf.Repo.one

        case results do
          nil -> struct(state, error: %{id: :not_found})
          m   -> struct(state, resp: m)
        end
    end
  end  
end

defimpl Perf.Resource.Read, for: Any do
  use Perf.Resource
  stage :read, mod: Perf.Resource.ReadAny
end