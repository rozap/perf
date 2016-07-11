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
        struct(state, kind: :bad_request, error: Perf.ErrorHelpers.format(cset))
      {:error, reason} ->
        # failed()
        struct(state, kind: :internal, error: reason)
      {:ok, inserted} ->
        created(state, inserted, %{"id" => inserted.id})
    end
  end
end

defimpl Perf.Resource.Create, for: Any do
  use Perf.Resource
  stage :create, mod: Perf.Resource.CreateAny
end
