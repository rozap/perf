defmodule Perf.ApiUserTest do
  use Phoenix.ChannelTest
  use ExUnit.Case
  @endpoint Perf.Endpoint

  setup do
    # Ecto.Adapters.SQL.restart_test_transaction(Perf.Repo)
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    {:ok, _, socket} = socket("api", %{})
    |> subscribe_and_join(Perf.ApiChannel, "api", %{})

    {:ok, %{socket: socket}}
  end

  test "can create a user", %{socket: socket} do
    ref = push(socket, "create:user", %{
      "email": "baz@buzz.com",
      "password": "foobarbaz"
    })

    assert_reply ref, :ok, %Perf.User{
      email: "baz@buzz.com"
    }
  end

  test "cannot create a user with a bad password", %{socket: socket} do
    ref = push(socket, "create:user", %{
      "email": "baz@buzz.com",
      "password": "a"
    })

    assert_reply ref, :error, %{
      error: %{
        english: "Error! password: should be at least 6 character(s)", 
        params: %{
          field_errors: %{
            password: ["should be at least 6 character(s)"]
          }
        }, 
        reason: :field_values_invalid
      },
      kind: :bad_request
    }
  end

end