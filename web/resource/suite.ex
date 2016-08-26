defmodule Perf.Resource.Suite do
  use Perf.Resource
  alias Perf.{User, Suite, Request, Repo}

  defimpl Perf.Resource.List, for: Perf.Suite do
    use Perf.Resource
    stage :query,    mod: Perf.Resource.ListAny
    stage :evaluate, mod: Perf.Resource.ListAny
    stage :meta,     mod: Perf.Resource.ListAny
    stage :load_requests, mod: Perf.Resource.Suite
  end

  defimpl Perf.Resource.Create, for: Perf.Suite do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Suite
    stage :create, mod: Perf.Resource.CreateAny
    stage :load_requests, mod: Perf.Resource.Suite
  end

  defimpl Perf.Resource.Read, for: Perf.Suite do
    use Perf.Resource
    stage :read, mod: Perf.Resource.ReadAny
    stage :load_requests, mod: Perf.Resource.Suite
  end

  def load_requests(_, %State{resp: %{"items" => suites} = resp} = state) do
    joined = Repo.preload(suites, :requests)
    resp = Map.put(resp, "items", joined)
    struct(state, resp: resp)
  end

  def load_requests(_, %State{resp: %Suite{} = suite} = state) do
    joined = Repo.preload(suite, :requests)
    struct(state, resp: joined)
  end

  def check_auth(_, %State{socket: socket, params: params} = state) do
    case socket.assigns do
      %{user: %User{} = user} ->
        params = Map.put(params, "user_id", user.id)
        struct(state, params: params)
      _ -> forbidden(state)
    end
  end

end