defmodule RunTest do
  use Phoenix.ChannelTest
  use ExUnit.Case
  @endpoint Perf.Endpoint
  import Perf.TestHelpers

  alias Perf.{Repo, Run}
  alias Perf.Yams
  alias Perf.Runner.Events.Done

  setup do
    # Ecto.Adapters.SQL.restart_test_transaction(Perf.Repo)
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    {:ok, _, socket} = socket("api", %{})
    |> subscribe_and_join(Perf.ApiChannel, "api", %{})

    user_attempt = push(socket, "create:user", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })
    user = wait_for(user_attempt)

    login_attempt = push(socket, "create:session", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })
    session = wait_for(login_attempt)

    auth_attempt = push(socket, "read:session", %{
      "token" => session.token
    })

    auth = wait_for(auth_attempt)

    suite = make_suite

    {:ok, %{socket: socket, suite: suite}}
  end

  test "can create a run", %{socket: socket, suite: suite} do
    events = push(socket, "create:run", %{
      "suite_id" => suite.id
    })
    |> wait_for
    |> wait_for_run_completion

    assert length(events) > 0
  end

  test "can list runs", %{socket: socket, suite: suite} do
    Enum.each(1..30, fn _ ->
      Repo.insert!(%Run{suite: suite})
    end)

    resp = push(socket, "list:run", %{
      "suite_id" => suite.id
    })
    |> wait_for_json

    assert resp["count"] == 30
    assert length(resp["items"]) == 16

    resp
    |> Map.get("items")
    |> Enum.each(fn run ->
      assert run["suite"]["id"] == suite.id
      assert length(run["suite"]["requests"]) > 0
    end)
  end

end