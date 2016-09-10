defmodule YamChannelTest do
  use Phoenix.ChannelTest
  use ExUnit.Case
  @endpoint Perf.Endpoint
  import Perf.TestHelpers
  alias Perf.{Repo, Suite, Request, Run, User}

  alias Perf.Yams
  alias Perf.Runner.Events.Done

  setup do
    # Ecto.Adapters.SQL.restart_test_transaction(Perf.Repo)
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    suite = make_suite
    run = Repo.insert!(%Run{suite: suite})

    {:ok, _, socket} = socket("yams", %{})
    |> subscribe_and_join(Perf.YamsChannel, "yams", %{
      "run_id" => run.id
      })

    yam = make_yam_stream
    {:ok, %{socket: socket, yam: yam, suite: suite, run: run}}
  end

  test "can get a query", %{socket: socket, suite: suite, run: run} do
    run = push(socket, "create:run", %{
      "suite_id" => suite.id
    })
    |> wait_for
    |> IO.inspect

  end


end