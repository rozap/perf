defmodule Perf.Resource.Run do
  use Perf.Resource
  import Ecto.Query
  alias Perf.{User, Suite, Request, Repo, Run, Runner}
  alias Perf.Yams.Handle
  require Logger

  defimpl Perf.Resource.Create, for: Run do
    use Perf.Resource
    stage :create, mod: Perf.Resource.CreateAny
    stage :load_suite, mod: Perf.Resource.Run
    stage :start_run, mod: Perf.Resource.Run
  end

  defimpl Perf.Resource.Read, for: Run do
    use Perf.Resource
    stage :read, mod: Perf.Resource.ReadAny
    stage :load_suite, mod: Perf.Resource.Run
  end

  defimpl Perf.Resource.List, for: Perf.Run do
    use Perf.Resource
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

end