defmodule RunnerTest do
  use ExUnit.Case
  alias Perf.{Runner, Run, Suite, User, Repo}
  alias Perf.Suite.Request
  alias Perf.Runner.{Consumer, Producer}
  alias Perf.Runner.Events.{Done, Error, Success}

  setup_all do
    Runner.start_link
    :ok
  end
  setup do

    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    :ok
  end

  test "can run the thing and get some errors for a bad method" do
    suite = %Suite{
        name: "test",
        description: "testtest",
        trigger: %{},
        requests: [
          %Request{
            method: "FOO",
            path: "https://aircooledrescue.com",
            params: %{"qux" => 42},
            body: :empty,
            headers: %{
              "Content-Type": "application/json"
            },
            concurrency: 2,
            runlength: 50,
            timeout: 20,
            receive_timeout: 20
          }
        ],
        user: %User{
          email: "something"
        }
      }
    {:ok, event_stream} = suite
    |> Repo.insert!
    |> Producer.execute

    errors = event_stream
    |> Stream.take_while(fn
      {_, %Done{}} -> false
      _ -> true
    end)
    |> Stream.map(fn {_, e} -> e end)
    |> Enum.into([])
    |> Enum.filter(fn
      %Error{} -> true
      _ -> false
    end)

    assert length(errors) > 0
  end

  test "can run the thing and get some results for a working website" do
    suite = %Suite{
        name: "test",
        description: "testtest",
        trigger: %{},
        requests: [
          %Request{
            method: "GET",
            path: "https://aircooledrescue.com",
            params: %{"qux" => 42},
            body: :empty,
            headers: %{
              "Content-Type": "application/json"
            },
            concurrency: 2,
            runlength: 50,
            timeout: 750,
            receive_timeout: 750
          }
        ],
        user: %User{
          email: "something"
        }
      }
    {:ok, event_stream} = suite
    |> Repo.insert!
    |> Producer.execute

    success = event_stream
    |> Stream.take_while(fn
      {_, %Done{}} -> false
      _ -> true
    end)
    |> Stream.map(fn {_, e} -> e end)
    |> Stream.filter(fn
      %Success{} -> true
      _ -> false
    end)
    |> Enum.into([])

    assert length(success) > 0
  end

end