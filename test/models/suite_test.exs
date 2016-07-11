defmodule Perf.SuiteTest do
  use Perf.ModelCase

  alias Perf.Suite

  @valid_attrs %{name: "some content", trigger: %{}}
  @invalid_attrs %{}

  test "changeset with valid attributes" do
    changeset = Suite.changeset(%Suite{}, @valid_attrs)
    assert changeset.valid?
  end

  test "changeset with invalid attributes" do
    changeset = Suite.changeset(%Suite{}, @invalid_attrs)
    refute changeset.valid?
  end
end
