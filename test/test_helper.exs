defmodule Perf.TestHelpers do
  alias Phoenix.Socket.Reply
  alias Perf.Yams
  alias Perf.{Repo, Run, Request, Suite, User}

  def wait_for(ref) do
    receive do
      %Reply{payload: p, ref: ^ref} -> p
    end
  end

  def make_yam_stream(ref \\ nil) do
    {:created, h} = Yams.Handle.open(ref || UUID.uuid1())
    from_ts = 1472175016297554068
    Enum.each(30..60, fn num ->
      t = num - 30
      key = from_ts + Yams.ms_to_key(t)
      :ok = Yams.Handle.put(h, key, %{"num" => num, "str" => "foo_#{num}"})
    end)
    to_ts = from_ts + Yams.ms_to_key(20)
    range = {from_ts, to_ts}

    stream = Yams.Handle.stream!(h, range)
  end

  def make_suite do
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

    Repo.insert!(suite)
  end
end
ExUnit.configure seed: elem(:os.timestamp, 2)
ExUnit.start(timeout: 5_000)
Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, :manual)

