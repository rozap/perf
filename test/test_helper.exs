defmodule Perf.TestHelpers do
  alias Phoenix.Socket.Reply
  alias Perf.{Repo, Request, Suite, User}

  def wait_for(ref) do
    receive do
      %Reply{payload: p, ref: ^ref} -> p
    end
  end

  def wait_for_run_completion(run) do
    {_, handle} = Yams.Session.open(run.yam_ref)
    Yams.Session.changes(handle)
    |> Yams.Query.as_stream!
    |> Stream.take_while(fn
      {_, %{"type" => "done"}} -> false
      _ -> true
    end)
    |> Enum.into([])
  end

  def wait_for_json(ref) do
    wait_for(ref)
    |> Poison.encode!
    |> Poison.decode!
  end

  def from_ts do
    1472175016297554068
  end

  def to_ts do
    from_ts + Yams.ms_to_key(20)
  end

  def make_yam_stream(ref \\ nil) do
    {:created, h} = Yams.Session.open(ref || UUID.uuid1())
    Enum.each(30..60, fn num ->
      t = num - 30
      key = from_ts + Yams.ms_to_key(t)
      :ok = Yams.Session.put(h, key, %{
        "num" => num,
        "str" => "foo_#{num}",
        "start_t" => Yams.key_to_ms(from_ts),
        "end_t" => Yams.key_to_ms(from_ts) + num,
        "size" => num * num * num
      })
    end)
    range = {from_ts, to_ts}

    Yams.Session.stream!(h, range)
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
            min_concurrency: 2,
            max_concurrency: 4,
            step_size: 1,
            step_duration: 1000,
            timeout: 2,
            receive_timeout: 2
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

