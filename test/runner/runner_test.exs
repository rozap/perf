defmodule RunnerTest do
  use ExUnit.Case
  alias Perf.{Runner, Run, Suite, User}
  alias Perf.Suite.Request
  alias Perf.Runner.{Consumer, Producer}
  alias Perf.Runner.Events.{Done}

  setup do
    Runner.start_link
    :ok
  end

  test "can run the thing and get some errors" do
    run = %Run{
      suite: %Suite{
        name: "test",
        description: "testtest",
        trigger: %{},
        requests: [
          %Request{
            path: "https://google.com",
            params: [{"qux", 42}],
            body: :empty,
            headers: %{
              "Content-Type": "application/json"
            },
            concurrency: 5,
            runlength: 2000,
            timeout: 5,
            receive_timeout: 5
          }
        ],
        user: %User{
          email: "something"
        }
      }
    }
    ref = UUID.uuid1()
    Producer.execute(run, ref)
    |> Stream.take_while(fn
      {_, %Done{}} -> false
      _ -> true
    end)
    |> Enum.into([])
    |> IO.inspect
  end

end