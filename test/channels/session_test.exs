defmodule Perf.ApiSessionTest do
  use Phoenix.ChannelTest
  use ExUnit.Case
  @endpoint Perf.Endpoint
  import Perf.TestHelpers

  setup do
    # Ecto.Adapters.SQL.restart_test_transaction(Perf.Repo)
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    {:ok, _, socket} = socket("api", %{})
    |> subscribe_and_join(Perf.ApiChannel, "api", %{})

    {:ok, %{socket: socket}}
  end

  test "can log in", %{socket: socket} do
    user_attempt = push(socket, "create:user", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })

    user = wait_for(user_attempt)

    login_attempt = push(socket, "create:session", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })

    assert_reply login_attempt, :ok, %Perf.Session{
      user: ^user,
      token: _
    }, 200
  end

  test "can get a reasonable response on screwup of auth", %{socket: socket} do
    user_attempt = push(socket, "create:user", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })
    _ = wait_for(user_attempt)

    session_attempt = push(socket, "create:session", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })
    session = wait_for(session_attempt)

    verify_attempt = push(socket, "read:session", %{
      "jwt" => session.token
    })
    verify = wait_for(verify_attempt)

    assert verify == %{
      kind: :bad_request,
      error: %Perf.Resource.Error{
        english: "I didn't see token and saw jwt which I didn't expect",
        params: %{"extras" => ["jwt"], "omitted" => ["token"]},
        reason: "field_set_invalid"
      }
    }
  end

  test "can check if a token is valid", %{socket: socket} do
    user_attempt = push(socket, "create:user", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })
    _ = wait_for(user_attempt)

    session_attempt = push(socket, "create:session", %{
      "email" => "baz@buzz.com",
      "password" => "foobarbaz"
    })
    session = wait_for(session_attempt)

    ok_attempt = push(socket, "read:session", %{
      "token" => session.token
    })
    ok = wait_for(ok_attempt)
    assert ok["iss"] == "Perf"

    Guardian.revoke! session.token

    revoked_attempt = push(socket, "read:session", %{
      "token" => session.token
    })
    revoked = wait_for(revoked_attempt)

    assert revoked == %{error: %{reason: "expired"}, kind: :not_found}
  end

end