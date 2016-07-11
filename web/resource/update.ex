
defmodule Perf.Resource.UpdateAny do
  alias Perf.Resource.State
  alias Perf.Resource.Read

  def update(model, %State{params: params, socket: socket} = state) do
    case Read.handle(model, state) do
      %State{resp: instance} ->
        session = Map.get(socket.assigns, :session, nil)
        cset = model.__struct__.changeset(
          instance,
          params
        )
        case Perf.Repo.update(cset) do
          {:ok, _} -> state
          {:error, reason} -> struct(state, error: reason)
        end
      err -> err
    end
  end  
end

defimpl Perf.Resource.Update, for: Any do
  use Perf.Resource
  stage :update, mod: Perf.Resource.UpdateAny
  stage :handle, mod: Perf.Resource.Read

end