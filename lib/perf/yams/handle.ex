defmodule Perf.Yams.Handle do
  use GenServer

  def init([key: key]) do
    {:ok, ref} = Application.get_env(:perf, :yams)[:space]
    |> Path.join(key)
    |> :binary.bin_to_list
    |> :eleveldb.open([create_if_missing: true])

    {:ok, %{
      db: ref
      }}
  end

  def handle_call({:put, row}, _, state) do
    key = "#{System.os_time(:milliseconds)}"
    value = :erlang.term_to_binary(row)

    IO.puts key
    result = :eleveldb.put(state.db, key, value, [])
    {:reply, result, state}
  end

  def handle_call({:stream, start_time, end_time}, _, state) do
    IO.puts "#{start_time}, #{end_time}"
    stream = Stream.resource(
      fn ->
        {:ok, ref} = :eleveldb.iterator(state.db, [])
        {:first, ref}
      end,
      fn {state, ref} ->
        case :eleveldb.iterator_move(ref, state) do
          {:ok, key, bin} ->
            value = :erlang.binary_to_term(bin)
            {[{key, value}], {:next, ref}}
          {:error, err} ->
            {:halt, {:done, ref}}
        end
      end,
      fn {_, ref} -> :eleveldb.iterator_close(ref) end
    )

    {:reply, stream, state}
  end

  def stream!(pid, start_time, end_time) do
    GenServer.call(pid, {:stream, start_time, end_time})
  end

  def put(pid, row) do
    GenServer.call(pid, {:put, row})
  end

  def open(key) do
    name = String.to_atom("yams_handler_#{key}")

    case Process.whereis(name) do
      nil ->
        GenServer.start(__MODULE__, [key: key], [name: name])
      pid -> pid
    end
  end
end