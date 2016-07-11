defmodule Perf.Resource.DeleteAny do
  require Logger
  alias Perf.Resource.State

  def delete(_, %State{resp: instance} = state) do
    case Perf.Repo.delete(instance) do
      {:ok, _} -> 
        state
      {:error, reason} -> 
        struct(state, error: reason)
    end
  end
end

defimpl Perf.Resource.Delete, for: Any do
  use Perf.Resource
  stage :handle, mod: Perf.Resource.Read
  stage :delete, mod: Perf.Resource.DeleteAny
end
