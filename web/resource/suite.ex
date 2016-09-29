defmodule Perf.Resource.Suite do
  use Perf.Resource
  alias Perf.{User, Suite, Repo}

  defimpl Perf.Resource.List, for: Perf.Suite do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Stages
    stage :filter_by_user, mod: Perf.Resource.Suite
    stage :query,    mod: Perf.Resource.ListAny
    stage :evaluate, mod: Perf.Resource.ListAny
    stage :meta,     mod: Perf.Resource.ListAny
    stage :load_requests, mod: Perf.Resource.Suite
  end

  defimpl Perf.Resource.Create, for: Perf.Suite do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Stages
    stage :create, mod: Perf.Resource.CreateAny
    stage :load_requests, mod: Perf.Resource.Suite
  end

  defimpl Perf.Resource.Read, for: Perf.Suite do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Stages
    #TODO filter by user id here
    stage :filter_by_user, mod: Perf.Resource.Suite
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

  def filter_by_user(_, %State{params: %{"user_id" => user_id} = params} = state) do
    wheres = params
    |> Map.get("where", %{})
    |> Map.put("user_id", user_id)

    params = Map.put(params, "where", wheres)
    struct(state, params: params)
  end

end