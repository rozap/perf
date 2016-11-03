defmodule Perf.YamsChannel do
  use Phoenix.Channel
  require Logger
  alias Yams.Session
  alias Perf.{Repo, Run}
  import Perf.Metrics

  @chunk 300

  def join("yams:" <> _, %{"run_id" => run_id}, socket) do
    case Repo.get(Run, run_id) do
      %Run{} = run ->
        case Session.open(run.yam_ref) do
          {:error, reason} ->
            Logger.warn("Failed to join yam, yam handle error #{inspect reason}")
            {:error, socket}
          {_, handle} ->
            socket = socket
            |> assign(:run, run)
            |> assign(:event_buf, [])
            |> assign(:handle, handle)

            Logger.info("Started yams channel for run #{run.id}")

            {:ok, socket}
        end
      error ->
        Logger.warn("Failed to join yam #{inspect error}")
        {:error, socket}
    end
  end



  def handle_in("change:events", %{"query" => query}, socket) do
    Logger.warn("Starting a changestream")
    spawn_link(fn ->
      changes = socket.assigns.handle
      |> Session.changes!
      |> Yams.Interpreter.run(query)

      case changes do
        {:ok, stream} ->
          stream
          |> Yams.Query.aggregates
          |> Yams.Query.as_stream!
          |> Stream.each(fn events ->
            push socket, "events", %{events: [events]}
          end)
          |> Stream.run
        {:error, err} ->
          Logger.warn("Failed to run change stream on #{inspect query} #{inspect err}")
      end
    end)

    {:reply, {:ok, %{}}, socket}
  end

  defp compile_query(query) do
    case Yams.Interpreter.compile(query) do
      {:error, reason} ->
        Logger.warn("Query failed to compile #{reason}")
        {:error, %{
          kind: :bad_request,
          error: %{
            english: reason,
            reason: "query_compilation_failure"
          }
        }}
      {:ok, _} = result -> result
    end
  end

  defp eval_query({:ok, query}, socket, {start_t_seconds, end_t_seconds}) do
    start_t = Yams.seconds_to_key(start_t_seconds)
    end_t = Yams.seconds_to_key(end_t_seconds)

    result = socket.assigns.handle
    |> Session.stream!({start_t, end_t})
    |> Yams.Interpreter.run(query)

    case result do
      {:ok, stream} ->
        spawn_link(fn ->
          {events, elapsed} = timer do
            # Logger.info("Running the query... #{Macro.to_string(quoted)}")
            events = stream
            |> Yams.Query.aggregates
            |> Yams.Query.as_stream!
            |> Stream.chunk(@chunk, @chunk, [])
            |> Stream.each(fn events ->
              Logger.info("Sending a batch of events")
              push socket, "events", %{events: events}
            end)
            |> Stream.run
          end
        end)

        {:ok, %{}}
      {:error, reason} ->
        Logger.warn("Query failed at runtime: #{inspect reason}")
        {:error, %{
          kind: :bad_request,
          error: %{
            english: reason,
            reason: "query_runtime_failure"
          }
        }}
    end
  end

  defp eval_query(result, _, _) do
    result
  end

  def handle_in("query:events", %{
      "start_t_seconds" => start_t_seconds,
      "end_t_seconds" => end_t_seconds,
      "query" => query}, socket) when is_number(start_t_seconds) and is_number(end_t_seconds) do

    resp = query
    |> compile_query
    |> eval_query(socket, {start_t_seconds, end_t_seconds})

    IO.inspect resp

    {:reply, resp, socket}
  end

  def handle_in(message, params, socket) do
    Logger.warn("Got bad request #{message} #{inspect params}")
    {:reply, {:error, %{kind: :bad_request}}, socket}
  end

  def handle_info(_, socket) do
    {:noreply, socket}
  end

  def terminate(_reason, _socket) do
    :ok
  end
end