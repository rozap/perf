defmodule Perf.ApiSessionTest do
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

    {:ok, _, socket} = socket("api", %{})
    |> subscribe_and_join(Perf.ApiChannel, "api", %{})

    suite = %Suite{
        name: "test",
        description: "testtest",
        trigger: %{},
        requests: [
          %Request{
            method: "GET",
            path: "https://aircooledrescue.com/api/people",
            params: %{"qux" => 42},
            body: "",
            headers: %{
              "Content-Type": "application/json"
            },
            concurrency: 2,
            runlength: 1,
            timeout: 750,
            receive_timeout: 750
          }
        ],
        user: %User{
          email: "something"
        }
      }

    suite = Repo.insert!(suite)

    {:ok, %{socket: socket, suite: suite}}
  end

  test "can create a run", %{socket: socket, suite: suite} do
    run = push(socket, "create:run", %{
      "suite_id" => suite.id
    }) |> wait_for

    {_, handle} = Yams.Handle.open(run.yam_ref)
    Yams.Handle.changes(handle)
    |> Yams.Query.as_stream!
    |> Stream.take_while(fn
      {_, %Done{}} -> false
      _ -> true
    end)
    |> Enum.into([])
    |> IO.inspect

  end


end