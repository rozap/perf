defmodule RunTest do
  use Phoenix.ChannelTest
  use ExUnit.Case
  @endpoint Perf.Endpoint
  import Perf.TestHelpers

  alias Perf.Yams
  alias Perf.Runner.Events.Done

  setup do
    # Ecto.Adapters.SQL.restart_test_transaction(Perf.Repo)
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    {:ok, _, socket} = socket("api", %{})
    |> subscribe_and_join(Perf.ApiChannel, "api", %{})

    suite = make_suite

    {:ok, %{socket: socket, suite: suite}}
  end

  # test "can create a run", %{socket: socket, suite: suite} do
  #   run = push(socket, "create:run", %{
  #     "suite_id" => suite.id
  #   }) |> wait_for

  #   {_, handle} = Yams.Handle.open(run.yam_ref)
  #   Yams.Handle.changes(handle)
  #   |> Yams.Query.as_stream!
  #   |> Stream.take_while(fn
  #     {_, %Done{}} -> false
  #     _ -> true
  #   end)
  #   |> Enum.into([])
  #   |> IO.inspect

  # end


end