defmodule ApiTest.User do
  use Perf.ConnCase

  test "password is at least 6" do
    body = Poison.encode! %{
      "email" => "foo@bar.com",
      "password" => "stuff"
    }

    conn = build_conn()
    |> put_req_header("content-type", "application/json")
    |> post("/api/user", body)

    assert conn.status == 400
    assert Poison.decode!(conn.resp_body) == %{
      "password" => ["should be at least 6 character(s)"]
    }
  end

  test "all fields required" do
    body = Poison.encode! %{
      "email" => "foo@bar.com"
    }

    conn = build_conn()
    |> put_req_header("content-type", "application/json")
    |> post("/api/user", body)

    assert conn.status == 400
    assert Poison.decode!(conn.resp_body) == %{
      "password" => ["can't be blank"]
    }
  end

  test "duplicate user" do
    body = Poison.encode! %{
      "email" => "foo@bar.com",
      "password" => "stuffstuff"
    }

    conn = build_conn()
    |> put_req_header("content-type", "application/json")
    |> post("/api/user", body)

    assert conn.status == 201

    body = Poison.encode! %{
      "email" => "foo@bar.com",
      "password" => "stuffstuff"
    }

    conn = build_conn()
    |> put_req_header("content-type", "application/json")
    |> post("/api/user", body)

    assert conn.status == 400
    assert Poison.decode!(conn.resp_body) == %{"email" => ["has already been taken"]}
  end

  test "can create a user" do
    body = Poison.encode! %{
      "email" => "foo@bar.com",
      "password" => "stuffstuff"
    }

    conn = build_conn()
    |> put_req_header("content-type", "application/json")
    |> post("/api/user", body)

    assert %{"email" => "foo@bar.com"} = Poison.decode!(conn.resp_body)
  end
end