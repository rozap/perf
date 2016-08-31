defmodule Perf.Resource.CreateAny do
  require Logger
  alias Perf.Resource.State
  alias Ecto.Changeset
  import Perf.Resource

  def create(model, %State{params: params} = state) do
    cset = model.__struct__.changeset(model, params)
    Logger.info("Create #{inspect model} :: #{inspect params}")

    case Perf.Repo.insert(cset) do
      {:error, %Changeset{} = cset} ->
        value_error(state, cset)
      {:error, reason} ->
        struct(state, kind: :internal, error: reason)
      {:ok, inserted} ->
        IO.inspect inserted
        created(state, inserted, %{"id" => inserted.id})
    end
  end
end

defimpl Perf.Resource.Create, for: Any do
  use Perf.Resource
  stage :create, mod: Perf.Resource.CreateAny
end
