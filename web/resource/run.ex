defmodule Perf.Resource.Run do
  use Perf.Resource
  import Ecto.Query
  alias Perf.{User, Repo, Run, Runner}
  require Logger

  defimpl Perf.Resource.Create, for: Run do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Stages
    # stage :filter_by_user, mod: Perf.Resource.Run
    stage :create, mod: Perf.Resource.CreateAny
    stage :load_suite, mod: Perf.Resource.Run
    stage :start_run, mod: Perf.Resource.Run
  end

  defimpl Perf.Resource.Read, for: Run do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Stages
    # stage :filter_by_user, mod: Perf.Resource.Run
    stage :read, mod: Perf.Resource.ReadAny
    stage :load_suite, mod: Perf.Resource.Run
  end

  defimpl Perf.Resource.List, for: Perf.Run do
    use Perf.Resource
    stage :check_auth, mod: Perf.Resource.Stages
    # stage :filter_by_user, mod: Perf.Resource.Run
    stage :query,    mod: Perf.Resource.ListAny
    stage :evaluate, mod: Perf.Resource.ListAny
    stage :meta,     mod: Perf.Resource.ListAny
    stage :load_suite, mod: Perf.Resource.Run
  end

  def start_run(_, %State{resp: %Run{} = run} = state) do
    res = Runner.RunServer.new(run)
    Logger.info("Starting run #{inspect run.suite.name} #{inspect res}")
    state
  end

  def load_suite(_, %State{resp: %Run{} = run} = state) do
    joined = Repo.preload(run, suite: :requests)
    struct(state, resp: joined)
  end

  def load_suite(_, %State{resp: %{"items" => runs} = resp} = state) do
    joined = Repo.preload(runs, suite: :requests)
    resp = Map.put(resp, "items", joined)
    struct(state, resp: resp)
  end

  def filter_by_user(_, %State{params: %{"user_id" => user_id} = params} = state) do
    wheres = params
    |> Map.get("where", %{})
    |> Map.put("suite.user_id", user_id)

    struct(state, params: %{"where" => wheres})
  end


end