defmodule Perf.YamsChannel do
  use Phoenix.Channel
  require Logger
  alias Phoenix.Socket
  alias Perf.Resource.State
  alias Perf.Yams.Handle
  alias Perf.{Repo, Run, Yams, Request}
  alias Perf.Runner.Events.{Success, Error, StartingRequest, Done}
  import Perf.Resource


  def join("yams", %{"run_id" => run_id}, socket) do
    case Repo.get(Run, run_id) do
      %Run{} = run -> 
        {_, handle} = Handle.open(run.yam_ref)

        socket = socket
        |> assign(:run, run)
        |> assign(:event_buf, [])
        |> assign(:handle, handle)

        Logger.info("Started yams channel for #{inspect run}")

        {:ok, socket}
      error -> 
        Logger.warn("Failed to join yam #{inspect error}")
        {:error, socket}
    end
  end

  defp is_measurable(%Success{}), do: true
  defp is_measurable(_), do: false

  defp group_events(%Success{request: r}), do: r
  defp group_events(%StartingRequest{request: r}), do: r
  defp group_events(%Error{request: r}), do: r
  defp group_events(%Done{}), do: :none

  defp aggregate(yam_stream, run) do
    yam_stream
    |> Yams.Stats.bucket({Yams.to_key(run.inserted_at), nil}, Yams.seconds_to_key(1))
    |> Stream.map(fn bucket -> 

      {measurable, others} = bucket
      |> Enum.map(fn {_, event} -> event end)
      |> Enum.partition(&is_measurable/1)

      measurable
      |> Enum.group_by(&group_events/1)
      |> Enum.flat_map(fn {request, events} ->

        times = Enum.map(events, &(&1.at))
        start_t = Enum.min(times)
        end_t = Enum.max(times)
        measured = Enum.filter_map(events, &measure/1, &measure/1)

        [:latency, :throughput]
        |> Enum.map(fn measure ->
          measures = Enum.map(measured, fn m -> Map.get(m, measure) end)
          
          stats = Enum.map([50, 75, 90], fn p ->
            case measures do
              [] -> {"p_#{p}", 0}
              [m] -> {"p_#{p}", m}
              _ -> {"p_#{p}", Statistics.percentile(measures, p)}
            end
            
          end)
          |> Enum.into(%{})

          {measure, %{
            "start_t_seconds" => Yams.key_to_seconds(start_t),
            "end_t_seconds" => Yams.key_to_seconds(end_t), 
            "request_id" => request.id, 
            "stats" => stats
          }}
        end)
      end)
    end)
  end

  defp group_into_measures(measures) do
    Enum.reduce(measures, %{}, fn ({measure, d}, acc) -> 
      {_, a} = Map.get_and_update(acc, measure, fn 
        nil -> {nil, [d]}
        current -> {current, [d | current]}
      end)
      a
    end)
  end

  def measure(%Success{} = e) do
    elapsed = Yams.key_to_ms(e.end_t - e.start_t)
    %{
      latency: elapsed,
      throughput: e.size / elapsed
    }
  end
  def measure(_) do
    false
  end

  def handle_in("change:events", _, socket) do
    streamer = spawn_link(fn -> 
      run = socket.assigns.run
      
      Handle.changes(socket.assigns.handle)
      |> aggregate(run)
      |> Stream.each(fn measures -> 
        push socket, "change:events", %{events: group_into_measures(measures)}
      end)
      |> Stream.run
    end)

    socket = assign(socket, :streamer, streamer)

    {:reply, {:ok, %{}}, socket}
  end

  def handle_in("list:events", %{"start_t_seconds" => start_t_seconds, "end_t_seconds" => end_t_seconds}, socket) do
    start_t = Yams.seconds_to_key(start_t_seconds)
    end_t = Yams.seconds_to_key(end_t_seconds)

    run = socket.assigns.run

    events = socket.assigns.handle
    |> Handle.stream!({start_t, end_t})
    |> aggregate(run)
    |> Enum.into([])
    |> List.flatten
    |> Enum.reduce(%{}, fn ({measure, d}, acc) -> 
      {_, a} = Map.get_and_update(acc, measure, fn 
        nil -> {nil, [d]}
        current -> {current, [d | current]}
      end)
      a
    end)
    
    {:reply, {:ok, %{events: events}}, socket}
  end

  def handle_info(_, socket) do
    {:noreply, socket}
  end

  def terminate(_reason, _socket) do
    :ok
  end
end