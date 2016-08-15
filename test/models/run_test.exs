defmodule Perf.RunTest do
  use Perf.ModelCase

  alias Perf.Run

  @valid_attrs %{}
  @invalid_attrs %{}

  test "changeset with valid attributes" do
    changeset = Run.changeset(%Run{}, @valid_attrs)
    assert changeset.valid?
  end

  test "changeset with invalid attributes" do
    changeset = Run.changeset(%Run{}, @invalid_attrs)
    refute changeset.valid?
  end
end
