defmodule YamChannelTest do
  use Phoenix.ChannelTest
  use ExUnit.Case
  @endpoint Perf.Endpoint
  import Perf.TestHelpers
  alias Perf.{Repo, Suite, Request, Run, User}
  alias Perf.Yams

  setup do
    :ok = Ecto.Adapters.SQL.Sandbox.checkout(Perf.Repo)
    Ecto.Adapters.SQL.Sandbox.mode(Perf.Repo, {:shared, self()})

    suite = make_suite
    run = Repo.insert!(Run.changeset(%Run{suite_id: suite.id}))
    yam = make_yam_stream(run.yam_ref)

    {:ok, _, socket} = socket("yams", %{})
    |> subscribe_and_join(Perf.YamsChannel, "yams", %{
      "run_id" => run.id
      })

    {:ok, %{socket: socket, yam: yam, suite: suite, run: run}}
  end

  test "can get a simple aggregate", %{socket: socket, suite: suite, run: run} do
    aggs = push(socket, "query:events", %{
      "start_t_seconds" => Yams.key_to_seconds(from_ts),
      "end_t_seconds" => Yams.key_to_seconds(to_ts),
      "query" => [
        [".", ["bucket", 10, "milliseconds"]],
        [".", ["maximum", "row.num", "max_num"]],
        [".", ["aggregates"]]
      ]
    })
    |> wait_for_json
    |> Map.get("events")
    |> Enum.map(fn e -> e["aggregations"] end)

    assert aggs = [%{"max_num" => 40}, %{"max_num" => 49}, %{"max_num" => 50}]
  end

  test "can get a more complex aggregate", %{socket: socket, suite: suite, run: run} do
    aggs = push(socket, "query:events", %{
      "start_t_seconds" => Yams.key_to_seconds(from_ts),
      "end_t_seconds" => Yams.key_to_seconds(to_ts),
      "query" => [
        [".", ["bucket", 10, "milliseconds"]],
        [".", ["percentile", ["-", ["row.end_t", "row.start_t"]], 95, "p95_latency"]],
        [".", ["percentile", ["/", ["row.size", ["-", ["row.end_t", "row.start_t"]]]], 95, "p95_throughput"]],
        [".", ["aggregates"]]
      ]
    })
    |> wait_for_json
    |> Map.get("events")
    |> Enum.map(fn e -> e["aggregations"] end)

    assert aggs ==  [
      %{"p95_latency" => 39.5, "p95_throughput" => 1560.5},
      %{"p95_latency" => 48.6, "p95_throughput" => 2362.2},
      %{"p95_latency" => 50.0, "p95_throughput" => 2.5e3}
    ]

  end



end