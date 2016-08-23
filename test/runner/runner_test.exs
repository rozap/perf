defmodule YamsTest do
  use ExUnit.Case
  alias Perf.{Runner, Run, Suite, User}
  alias Perf.Suite.Request
  alias Perf.Runner.{Consumer, Producer}

  setup do
    Runner.start_link
    :ok
  end

  test "can put and get" do
    run = %Run{
      suite: %Suite{
        name: "test",
        description: "testtest",
        trigger: %{},
        requests: [
          %Request{
            path: "https://foo.com/bar/baz",
            params: [{"qux", 42}],
            body: :empty,
            headers: %{
              "Content-Type": "application/json"
            },
            concurrency: 20,
            runlength: 5            
          }
        ],
        user: %User{
          email: "something"
        }
      }
    }

    Producer.execute(run)
    
  end

end