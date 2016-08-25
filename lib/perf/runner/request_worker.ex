defmodule Perf.Runner.RequestWorker do
  alias Experimental.GenStage
  use GenStage
  alias Perf.Suite.Request
  alias Perf.Yams
  require Logger
  alias Perf.Runner.Events.Result

  def start_link(_) do
    GenStage.start_link(__MODULE__, [])
  end

  def init(_) do
    {:producer_consumer, %{}}
  end

  defp request(method, request) do
    HTTPoison.request(method, request.path, "", [], [
      timeout: request.timeout,
      recv_timeout: request.receive_timeout
    ])
  end

  defp time(func) do
    start_t = Yams.key
    result = func.()
    end_t = Yams.key

    {result, {start_t, end_t}}
  end

  defp on_event(%Request{method: "GET"} = r) do
    {result, range} = time fn -> request(:get, r) end
    {r, result, range}
  end

  defp on_event(ev), do: ev

  defp to_result({request, {:error, %HTTPoison.Error{reason: reason}}, _}) do
    %Result{
      reason: reason
    }
  end

  defp to_result({request, {:ok, response}, range}) do
    {start_t, end_t} = range
    %HTTPoison.Response{body: body, status_code: status} = response
    size = byte_size(body)

    %Result{
      size: size,
      start_t: start_t,
      end_t: end_t,
      status: status,
      success: true,
      request: request
    }
  end

  defp to_result(ev), do: ev

  def handle_events(events, _, state) do
    Logger.debug("RequestWorker got #{inspect events}")
    results = events
    |> Enum.map(fn event ->
      event
      |> on_event
      |> to_result
    end)
    {:noreply, results, state}
  end

  def handle_info({ref, {:broadcast, event}}, state) do
    GenStage.async_notify(self, {:broadcast, event})
    {:noreply, [], state}
  end

  def handle_info(_, state) do
    {:noreply, [], state}
  end


  def stop(pid) do
    :poolboy.checkin(RequestWorker, pid)
  end

end