defmodule RunnerTest do
  use ExUnit.Case
  import Perf.TestHelpers

  alias Perf.{Yams, Repo, Run}
  alias Perf.Runner.Events.Done
  alias Perf.Runner.RunServer

  setup do
    # Ecto.Adapters.SQL.restart_test_transaction(Perf.Repo)
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    suite = make_suite
    RunServer.start_link

    {:ok, %{suite: suite}}
  end

  test "can create a run, and workers are returned to the pool", %{suite: suite} do
    run = Repo.insert!(Run.changeset(%Run{suite_id: suite.id}))

    RunServer.new(run)
    wait_for_run_completion(run)

    run = Repo.get!(Run, run.id)

    assert run.finished_at > run.started_at


  end

end