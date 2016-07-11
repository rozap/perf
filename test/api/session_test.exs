defmodule ApiTest.Session do
  use Perf.ConnCase

  test "can create a session" do
    body = Poison.encode! %{
      "email" => "foo@bar.com",
      "password" => "stuffstuff"
    }

    build_conn()
    |> put_req_header("content-type", "application/json")
    |> post("/api/user", body)

    con = build_conn()
    |> put_req_header("content-type", "application/json")
    |> post("/api/session", body)

    result = Poison.decode! con.resp_body

    assert Map.has_key?(result, "token")
    assert Map.has_key?(result, "user")
  end
end