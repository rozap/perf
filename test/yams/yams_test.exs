defmodule YamsTest do
  use ExUnit.Case
  alias Perf.Yams.Handle
  alias Perf.Yams
  alias Perf.Yams.Query

  setup do
    Yams.start_link
    :ok
  end

  test "can put and get" do
    from_ts = Yams.key

    {:created, h} = Handle.open(UUID.uuid1())

    :ok = Handle.put(h, Yams.key, [:a, :b, :c])
    :ok = Handle.put(h, Yams.key, [:d, :e, :f])
    :ok = Handle.put(h, Yams.key, [:g, :h, :i])

    to_ts = Yams.key

    values = Handle.stream!(h, {from_ts, to_ts})
    |> Query.as_stream!
    |> Stream.map(fn {_, v} -> v end)
    |> Enum.into([])

    assert values == [
      [:a, :b, :c],
      [:d, :e, :f],
      [:g, :h, :i]
    ]
  end

  test "can get a changes stream, put to it and get rows" do

    ref = UUID.uuid1()

    task = Task.async(fn ->
      {_, pid} = Handle.open(ref)
      Handle.changes(pid)
      |> Query.as_stream!
      |> Stream.map(fn {_, v} -> v end)
      |> Enum.into([])
    end)

    {_, h} = Handle.open(ref)

    from_ts = Yams.key
    :ok = Handle.put(h, Yams.key, [:a, :b, :c])
    :ok = Handle.put(h, Yams.key, [:d, :e, :f])
    :ok = Handle.put(h, Yams.key, [:g, :h, :i])
    to_ts = Yams.key


    send task.pid, :done
    changes = Task.await(task)

    assert changes == [
      [:a, :b, :c],
      [:d, :e, :f],
      [:g, :h, :i]
    ]

    values = Handle.stream!(h, {from_ts, to_ts})
    |> Query.as_stream!
    |> Stream.map(fn {_, v} -> v end)
    |> Enum.into([])

    assert values == changes
  end

  test "can shut down a changes stream" do

    ref = UUID.uuid1()

    task = Task.async(fn ->
      {_, pid} = Handle.open(ref)
      Handle.changes(pid)
      |> Query.as_stream!
      |> Stream.map(fn {_, v} -> v end)
      |> Enum.into([])
    end)

    {_, h} = Handle.open(ref)

    assert Handle.listeners(h) == {:ok, 1}

    send task.pid, :done
    Task.await(task)

    :ok = Handle.put(h, Yams.key, [:a, :b, :c])
    :ok = Handle.put(h, Yams.key, [:d, :e, :f])
    :ok = Handle.put(h, Yams.key, [:g, :h, :i])

    assert Handle.listeners(h) == {:ok, 0}
  end
end