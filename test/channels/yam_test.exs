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
    run = Repo.insert!(Run.changeset(%Run{suite_id: suite.id}))
    yam = make_yam_stream(run.yam_ref)

    {:ok, _, socket} = socket("yams", %{})
    |> subscribe_and_join(Perf.YamsChannel, "yams", %{
      "run_id" => run.id
      })

    {:ok, %{socket: socket, yam: yam, suite: suite, run: run}}
  end

  test "can get a query", %{socket: socket, suite: suite, run: run} do
    run = push(socket, "query:events", %{
      "start_t_seconds" => Yams.key_to_seconds(from_ts),
      "end_t_seconds" => Yams.key_to_seconds(to_ts),
      "query" => [
        [".", ["bucket", 10, "milliseconds"]],
        [".", ["maximum", "num"]]
      ]
    })
    |> wait_for
    |> IO.inspect

  end


end